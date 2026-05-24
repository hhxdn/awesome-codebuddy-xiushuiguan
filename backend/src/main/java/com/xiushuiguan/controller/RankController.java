package com.xiushuiguan.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiushuiguan.common.R;
import com.xiushuiguan.dto.RankDTO;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/rank")
public class RankController {

    @Autowired
    private UserService userService;

    @GetMapping("/list")
    public R<IPage<RankDTO>> getRankList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<User> pageParam = new Page<>(page, size);
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        wrapper.orderByDesc(User::getHighestLevel)
               .orderByDesc(User::getTotalStars);

        IPage<User> userPage = userService.page(pageParam, wrapper);

        Page<RankDTO> resultPage = new Page<>(userPage.getCurrent(), userPage.getSize(), userPage.getTotal());
        List<RankDTO> rankList = new ArrayList<>();
        long startRank = (page - 1) * size + 1;
        for (int i = 0; i < userPage.getRecords().size(); i++) {
            User user = userPage.getRecords().get(i);
            RankDTO dto = new RankDTO();
            dto.setUserId(user.getId());
            dto.setNickname(user.getNickname());
            dto.setAvatarUrl(user.getAvatarUrl());
            dto.setHighestLevel(user.getHighestLevel());
            dto.setTotalStars(user.getTotalStars());
            dto.setRank((int) (startRank + i));
            rankList.add(dto);
        }
        resultPage.setRecords(rankList);

        return R.ok(resultPage);
    }

    @GetMapping("/user/{userId}")
    public R<RankDTO> getUserRank(@PathVariable Long userId) {
        User targetUser = userService.getById(userId);
        if (targetUser == null) {
            return R.fail("用户不存在");
        }

        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        wrapper.gt(User::getHighestLevel, targetUser.getHighestLevel())
               .or()
               .eq(User::getHighestLevel, targetUser.getHighestLevel())
               .gt(User::getTotalStars, targetUser.getTotalStars());
        long rank = userService.count(wrapper) + 1;

        RankDTO dto = new RankDTO();
        dto.setUserId(targetUser.getId());
        dto.setNickname(targetUser.getNickname());
        dto.setAvatarUrl(targetUser.getAvatarUrl());
        dto.setHighestLevel(targetUser.getHighestLevel());
        dto.setTotalStars(targetUser.getTotalStars());
        dto.setRank((int) rank);

        return R.ok(dto);
    }
}
