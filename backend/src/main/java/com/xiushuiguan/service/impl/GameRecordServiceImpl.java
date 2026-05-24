package com.xiushuiguan.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiushuiguan.dto.GameResultDTO;
import com.xiushuiguan.entity.GameRecord;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.mapper.GameRecordMapper;
import com.xiushuiguan.service.GameRecordService;
import com.xiushuiguan.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
public class GameRecordServiceImpl extends ServiceImpl<GameRecordMapper, GameRecord> implements GameRecordService {

    @Autowired
    private UserService userService;

    @Override
    public GameRecord submitResult(GameResultDTO dto) {
        GameRecord record = new GameRecord();
        record.setUserId(dto.getUserId());
        record.setLevel(dto.getLevel());
        record.setStars(dto.getStars() != null ? dto.getStars() : 0);
        record.setTimeUsed(dto.getTimeUsed() != null ? dto.getTimeUsed() : 0);
        record.setIsWin(dto.getIsWin() != null ? dto.getIsWin() : false);
        record.setFailReason(dto.getFailReason());
        record.setScore(dto.getScore() != null ? dto.getScore() : 0);
        record.setCreatedAt(LocalDateTime.now());
        save(record);

        if (dto.getIsWin() != null && dto.getIsWin()) {
            User user = userService.getById(dto.getUserId());
            if (user != null) {
                int newStars = user.getTotalStars() + (dto.getStars() != null ? dto.getStars() : 0);
                user.setTotalStars(newStars);

                if (dto.getLevel() > user.getHighestLevel()) {
                    user.setHighestLevel(dto.getLevel());
                }
                user.setUpdatedAt(LocalDateTime.now());
                userService.updateById(user);
            }
        }

        return record;
    }

    @Override
    public IPage<GameRecord> getRecords(Long userId, int page, int size) {
        Page<GameRecord> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();
        if (userId != null) {
            wrapper.eq(GameRecord::getUserId, userId);
        }
        wrapper.orderByDesc(GameRecord::getCreatedAt);
        return page(pageParam, wrapper);
    }
}
