package com.xiushuiguan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xiushuiguan.dto.LoginDTO;
import com.xiushuiguan.entity.User;

public interface UserService extends IService<User> {

    User login(LoginDTO dto);

    User getUserInfo(Long userId);

    boolean updateProgress(Long userId, Integer highestLevel);
}
